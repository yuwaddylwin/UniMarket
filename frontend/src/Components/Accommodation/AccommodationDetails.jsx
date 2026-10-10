import { useParams } from "react-router-dom";
import { useAccommodations } from "../../hooks/useAccommodations";
import ListingFeed from "../Feed/ListingFeed";

export default function AccommodationDetails() {
  const { id } = useParams();
  const { accommodations, isLoading, error, refetch } = useAccommodations();

  return (
    <ListingFeed
      listings={accommodations}
      selectedId={id}
      listingType="accommodation"
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
    />
  );
}
