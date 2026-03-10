import { Suspense } from "react"
import { BlockingLoader } from "@/components/ui/blocking-loader"
import { SignInContent } from "./signin-content"

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-4">
          <BlockingLoader
            title="Loading sign in"
            description="The authentication screen is being prepared."
            className="w-full max-w-md"
          />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  )
}
