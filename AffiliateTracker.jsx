import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function AffiliateTracker() {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get("ref");

    if (!ref) return;

    // Save affiliate referral
    localStorage.setItem("agrobaz_affiliate_ref", ref);

    // Save the time the referral was created
    localStorage.setItem(
      "agrobaz_affiliate_ref_time",
      Date.now().toString()
    );

    console.log("🌾 Agrobaz Affiliate:", ref);
  }, [location.search]);

  return null;
}

export default AffiliateTracker;