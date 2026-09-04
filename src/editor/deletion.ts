export function removeByReference<T>(items: T[], item: T) {
  const index = items.indexOf(item);

  if (index >= 0) {
    items.splice(index, 1);
  }
}
