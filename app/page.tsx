import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Music } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-primary text-primary-foreground p-4 rounded-full">
            <Music size={40} />
          </div>
          <h1 className="text-3xl font-bold">Vibe Stream</h1>
        </div>

        <div className="space-y-4">
          <p className="text-xl">Your favorite tunes, all in one place.</p>
          <p className="text-muted-foreground">
            Login to start create your own playlists.
          </p>
        </div>

        <div className="space-y-4 pt-4">
          <Link href="/login" className="block">
            <Button size="lg" className="w-full text-base py-6">
              Login to Start Listening
            </Button>
          </Link>

          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

