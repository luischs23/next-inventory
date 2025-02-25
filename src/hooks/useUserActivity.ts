"use client";

import { useEffect } from "react";
import { useAuth } from "app/app/context/AuthContext";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "app/services/firebase/firebase.config";

export const useUserActivity = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const updateLastActivity = () => {
      const userRef = user.isDeveloper
        ? doc(db, "users", user.uid)
        : doc(db, `companies/${user.companyId}/users`, user.uid);

      setDoc(userRef, { lastActivity: serverTimestamp() }, { merge: true }).catch((error) =>
        console.error("Error updating last activity:", error)
      );
    };

    // 🔄 Actualizar `lastActivity` cada minuto (por si el usuario solo está mirando la pantalla)
    const intervalId = setInterval(updateLastActivity, 60 * 1000);

    // 🖱️ Detectar interacción del usuario
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, updateLastActivity));

    return () => {
      clearInterval(intervalId);
      events.forEach((event) => window.removeEventListener(event, updateLastActivity));
    };
  }, [user]);
};