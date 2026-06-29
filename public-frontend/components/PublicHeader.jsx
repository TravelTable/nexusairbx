import { HomepageHeader } from "../../src/components/homepage";
import PublicAccountState from "./PublicAccountState";

export default function PublicHeader() {
  return <HomepageHeader accountSlot={<PublicAccountState />} />;
}
