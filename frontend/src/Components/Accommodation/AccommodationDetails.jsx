import { useParams } from "react-router-dom";
import { useAccommodations } from "../Logics/useAccommodations";
import ListingFeed from "../Feed/ListingFeed";

export default function AccommodationDetails() {
  const { id } = useParams();
  const { accommodations, isLoading, error } = useAccommodations();

  return (
    <ListingFeed
      listings={accommodations}
      selectedId={id}
      listingType="accommodation"
      isLoading={isLoading}
      error={error}
    />
  );
}
