import { useNavigate } from "react-router-dom";

import HomepageLanding from "../components/homepage/HomepageLanding";

export default function BlankHomepage() {
  const navigate = useNavigate();

  return <HomepageLanding surface="homepage" navigateToAi={navigate} />;
}
