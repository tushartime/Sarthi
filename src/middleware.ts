import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/callback(.*)',
  '/api(.*)',
  '/live-webinar(.*)',
  '/demo(.*)',
  '/api/demo-agent(.*)',
  '/api/leads(.*)',
  '/',
])

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  const { userId } = await auth()
  if (!userId) {
    const signIn = new URL('/sign-in', req.url)
    const returnPath = `${req.nextUrl.pathname}${req.nextUrl.search}`
    signIn.searchParams.set('redirect_url', returnPath)
    return NextResponse.redirect(signIn)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};