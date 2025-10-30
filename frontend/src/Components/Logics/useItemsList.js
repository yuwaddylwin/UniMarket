import { useEffect, useState } from 'react';

export function useItemsList() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/api/items")
      .then((res) => res.json())
      .then((data) => setItems(data))
      .catch((err) => console.error(err));
  }, []);

  return { items, setItems };
}
