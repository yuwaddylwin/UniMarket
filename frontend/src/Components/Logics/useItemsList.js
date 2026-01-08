// src/Components/Logics/useItemsList.js
import { useEffect, useState } from "react";
import axios from "axios";

export function useItemsList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:8000/api/items", { withCredentials: true });
      setItems(res.data);
    } catch (err) {
      console.error("Fetch items error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return { items, loading, refetch: fetchItems };
}




// import { useEffect, useState } from 'react';

// export function useItemsList() {
//   const [items, setItems] = useState([]);

//   useEffect(() => {
//     fetch("http://localhost:8000/api/items")
//       .then((res) => res.json())
//       .then((data) => setItems(data))
//       .catch((err) => console.error(err));
//   }, []);

//   return { items, setItems };
// }
