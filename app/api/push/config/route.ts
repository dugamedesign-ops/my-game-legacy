import { getPublicPushConfig } from "../_utils";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(getPublicPushConfig());
}
