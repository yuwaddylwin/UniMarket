import { useParams } from "react-router-dom";
import { useItemsList } from "../../hooks/useItemsList";
import ListingFeed from "../Feed/ListingFeed";

export default function ProductsDetails() {
  const { id } = useParams();
  const { items, isLoading, error, refetch } = useItemsList();

  return (
    <ListingFeed
      listings={items}
      selectedId={id}
      listingType="item"
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
    />
  );
}
