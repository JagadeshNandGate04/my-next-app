"use client";

import { useEffect } from "react";
import { Provider, useDispatch } from "react-redux";
import { store, type AppDispatch } from "../store/store";
import { initializeAuth } from "../store/auth/authSlice";

function AuthInitializer({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  return <>{children}</>;
}

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Provider store={store}>
      <AuthInitializer>{children}</AuthInitializer>
    </Provider>
  );
}