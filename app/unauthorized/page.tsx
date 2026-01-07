import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4 text-center space-y-6">
            <h1 className="text-4xl font-bold text-red-500 font-orbitron">
                Access Denied
            </h1>
            <p className="text-gray-400 max-w-md">
                You do not have permission to access this page. If you believe this is an error, please contact support.
            </p>
            <Link href="/">
                <Button variant="outline" className="border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-black">
                    Return Home
                </Button>
            </Link>
        </div>
    );
}
