"use client";
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";

export function useProStatus() {
  const { user } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stripeCustomerId, setStripeCustomerId] = useState(null);

  useEffect(() => {
    if (!user) {
      setIsPro(false);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setIsPro(data.pro === true);
          setStripeCustomerId(data.stripeCustomerId || null);
        } else {
          setIsPro(false);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to pro status:", error);
        setIsPro(false);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleUpgrade = async (annual = true) => {
    if (!user) return;

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          userEmail: user.email,
          annual,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned:", data.error);
        alert("Failed to start checkout. Please try again.");
      }
    } catch (err) {
      console.error("Upgrade error:", err);
      alert("Something went wrong. Please try again.");
    }
  };

  const handleManageSubscription = async () => {
    if (!stripeCustomerId) {
      alert("No subscription found. Please contact support.");
      return;
    }

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: stripeCustomerId }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Portal error:", data.error);
        alert("Failed to open subscription management. Please try again.");
      }
    } catch (err) {
      console.error("Portal error:", err);
      alert("Something went wrong. Please try again.");
    }
  };

  return { isPro, loading, handleUpgrade, handleManageSubscription, stripeCustomerId };
}