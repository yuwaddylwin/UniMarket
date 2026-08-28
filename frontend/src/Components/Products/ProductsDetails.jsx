import { useParams } from "react-router-dom";
import { useItemsList } from "../Logics/useItemsList";
import ListingFeed from "../Feed/ListingFeed";

export default function ProductsDetails({ AddtoCart }) {
  const { id } = useParams();
  const { items, isLoading, error } = useItemsList();

  return (
    <ListingFeed
      listings={items}
      selectedId={id}
      listingType="item"
      isLoading={isLoading}
      error={error}
      onAddToCart={AddtoCart}
    />
  );
}
