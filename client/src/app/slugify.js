export const slugify = (str) =>
  str
    .normalize("NFD") // loại bỏ dấu tiếng Việt
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-"); // thay dấu cách = dấu gạch