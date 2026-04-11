import { CollectionDashboard } from "@/components/collection/CollectionDashboard";
import { mockItems } from "@/lib/mock-data";

export default function HomePage() {
  return <CollectionDashboard items={mockItems} />;
}