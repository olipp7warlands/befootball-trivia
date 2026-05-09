-- Allow authenticated users to insert their own profile row
create policy "profiles_insert_own"
  on profiles for insert
  with check (auth.uid() = id);
