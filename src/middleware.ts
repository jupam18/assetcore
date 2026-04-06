import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/assets/:path*",
    "/admin/:path*",
    "/reports/:path*",
    "/workflows/:path*",
    "/settings/:path*",
  ],
};
