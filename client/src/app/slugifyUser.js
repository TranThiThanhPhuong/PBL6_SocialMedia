export const slugifyUser = (user) => {
  if (!user) return "";
  return user.full_name.replace(/\s+/g, "-")
    ? user.full_name.replace(/\s+/g, "-")
    : user.username;
};