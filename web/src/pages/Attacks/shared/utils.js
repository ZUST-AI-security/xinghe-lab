export const createImageHandler = (setImageUrl) => (file) => {
  if (!file) {
    setImageUrl(null);
    return false;
  }
  const reader = new FileReader();
  reader.onload = (e) => setImageUrl(e.target.result);
  reader.readAsDataURL(file);
  return false;
};
