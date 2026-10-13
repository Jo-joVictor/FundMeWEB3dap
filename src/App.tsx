import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Activity from "./pages/Activity";
import Transparency from "./pages/Transparency";
import Owner from "./pages/Owner";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="activity" element={<Activity />} />
        <Route path="transparency" element={<Transparency />} />
        <Route path="owner" element={<Owner />} />
      </Route>
    </Routes>
  );
}