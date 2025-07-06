import Link from "next/link";

export function NoUserError() {
  return (
    <div className="container mx-auto p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">
          Authentication Required
        </h1>
        <p className="text-gray-600">
          Please{" "}
          <span className="text-blue-600 hover:text-blue-800 underline">
            <Link href="/">log in</Link>
          </span>{" "}
          to view this page.
        </p>
      </div>
    </div>
  );
}
