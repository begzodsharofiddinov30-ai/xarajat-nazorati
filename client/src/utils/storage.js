// localStorage xususiy rejimda yoki bloklanganda xato tashlashi mumkin.
export function getItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setItem(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* e'tiborsiz */
  }
}
