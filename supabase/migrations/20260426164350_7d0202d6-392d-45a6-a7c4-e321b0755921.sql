
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'vendor', 'buyer');

-- Sizes enum
CREATE TYPE public.product_size AS ENUM ('XS', 'S', 'M', 'L', 'XL');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Shops
CREATE TABLE public.shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  city TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shops are viewable by everyone" ON public.shops FOR SELECT USING (true);
CREATE POLICY "Owners can insert their shop" ON public.shops FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their shop" ON public.shops FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete their shop" ON public.shops FOR DELETE USING (auth.uid() = owner_id);
CREATE POLICY "Admins manage all shops" ON public.shops FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price_gnf BIGINT NOT NULL,
  category TEXT NOT NULL,
  detected_color TEXT,
  detected_object_type TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (true);
CREATE POLICY "Shop owners can insert products" ON public.products FOR INSERT WITH CHECK (
  auth.uid() = created_by AND EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())
);
CREATE POLICY "Shop owners can update their products" ON public.products FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())
);
CREATE POLICY "Shop owners can delete their products" ON public.products FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())
);
CREATE POLICY "Admins manage all products" ON public.products FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Product images
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  size product_size NOT NULL,
  position INT NOT NULL DEFAULT 0,
  detected_color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product images are viewable by everyone" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Shop owners can insert images" ON public.product_images FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.shops s ON s.id = p.shop_id
    WHERE p.id = product_id AND s.owner_id = auth.uid()
  )
);
CREATE POLICY "Shop owners can update images" ON public.product_images FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.shops s ON s.id = p.shop_id
    WHERE p.id = product_id AND s.owner_id = auth.uid()
  )
);
CREATE POLICY "Shop owners can delete images" ON public.product_images FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.shops s ON s.id = p.shop_id
    WHERE p.id = product_id AND s.owner_id = auth.uid()
  )
);
CREATE POLICY "Admins manage all product images" ON public.product_images FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER set_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_shops_updated BEFORE UPDATE ON public.shops FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto profile + buyer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'buyer');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

CREATE POLICY "Product images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Authenticated users can upload product images" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'product-images' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "Users can update their own product images" ON storage.objects FOR UPDATE USING (
  bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "Users can delete their own product images" ON storage.objects FOR DELETE USING (
  bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Indexes
CREATE INDEX idx_products_shop_id ON public.products(shop_id);
CREATE INDEX idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX idx_product_images_size ON public.product_images(size);
CREATE INDEX idx_shops_owner_id ON public.shops(owner_id);
