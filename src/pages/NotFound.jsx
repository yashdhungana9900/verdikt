import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound({ message = "That page doesn't exist. The link may be old or mistyped." }) {
  return (
    <div className="mx-auto max-w-md px-5 pt-32 text-center">
      <h1 className="mb-2 text-xl font-semibold">Nothing here</h1>
      <p className="mb-6 text-fg2">{message}</p>
      <Link to="/problems"><Button variant="primary">Browse problems</Button></Link>
    </div>
  );
}
