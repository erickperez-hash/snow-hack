import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Snowflake,
  MapPin,
  Clock,
  Shield,
  Star,
  Users,
  DollarSign,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: MapPin,
    title: "Local Providers",
    description:
      "Connect with trusted snow removal providers in your area who know your neighborhood.",
  },
  {
    icon: Clock,
    title: "Fast Response",
    description:
      "Post a job and receive bids within minutes. Get your property cleared before deadlines.",
  },
  {
    icon: DollarSign,
    title: "Competitive Pricing",
    description:
      "Transparent bidding ensures you get fair, competitive rates for every job.",
  },
  {
    icon: Shield,
    title: "Verified Work",
    description:
      "Before and after photos verify job completion. Payment is held until you confirm.",
  },
  {
    icon: Star,
    title: "Rated Providers",
    description:
      "Review ratings and history before accepting bids. Build trusted relationships.",
  },
  {
    icon: Users,
    title: "Community Driven",
    description:
      "From neighbors with shovels to pros with plows, everyone can participate.",
  },
];

const howItWorks = [
  {
    step: 1,
    title: "Post Your Job",
    description:
      "Describe what needs clearing, add photos, and set your deadline. It takes less than 2 minutes.",
  },
  {
    step: 2,
    title: "Receive Bids",
    description:
      "Local providers see your job and submit competitive bids with their price and availability.",
  },
  {
    step: 3,
    title: "Choose & Confirm",
    description:
      "Compare bids, check ratings, and accept the best offer. Your provider gets to work.",
  },
  {
    step: 4,
    title: "Verify & Pay",
    description:
      "Review completion photos, confirm the job is done right, and release payment securely.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Snowflake className="w-6 h-6 text-blue-600" aria-hidden="true" />
            <span>SnowProblem</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="container py-20 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4" variant="secondary">
              Now available in your area
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Snow removal,{" "}
              <span className="text-blue-600">solved</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              Connect with local snow removal services through transparent
              bidding. Post a job, receive competitive bids, and get your
              property cleared quickly.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/login">
                  Post a Job
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Become a Provider</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative snowflakes */}
        <div className="absolute top-10 left-10 text-blue-200 opacity-50" aria-hidden="true">
          <Snowflake className="w-8 h-8" />
        </div>
        <div className="absolute top-32 right-20 text-blue-200 opacity-30" aria-hidden="true">
          <Snowflake className="w-12 h-12" />
        </div>
        <div className="absolute bottom-20 left-1/4 text-blue-200 opacity-40" aria-hidden="true">
          <Snowflake className="w-6 h-6" />
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">
              Why Choose SnowProblem?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              A better way to handle winter weather
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title}>
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">How It Works</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Get your property cleared in four easy steps
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For providers */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <Badge className="mb-4 bg-white/20 text-white hover:bg-white/30">
                For Service Providers
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight mb-6">
                Turn snow into income
              </h2>
              <p className="text-lg text-blue-100 mb-8">
                Whether you have a shovel or a plow, join our network of
                providers and earn money clearing snow in your neighborhood.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  "Set your own rates and service area",
                  "Get notified of jobs nearby",
                  "Build your reputation with ratings",
                  "Fast, secure payments via Stripe",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-200" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/login">Start Earning</Link>
              </Button>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-transparent z-10 lg:hidden" />
              <div className="aspect-video rounded-lg bg-blue-500/30 flex items-center justify-center">
                <Snowflake className="w-24 h-24 text-blue-200" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-0">
            <CardContent className="py-12 text-center">
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Ready to solve your snow problem?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join thousands of property owners and service providers already
                using SnowProblem to handle winter weather.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" asChild>
                  <Link href="/login">
                    Get Started Free
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Snowflake className="w-5 h-5 text-blue-600" />
              <span className="font-semibold">SnowProblem</span>
            </div>
            <nav className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <Link href="/about" className="hover:text-foreground">
                About
              </Link>
              <Link href="/pricing" className="hover:text-foreground">
                Pricing
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
              <Link href="/contact" className="hover:text-foreground">
                Contact
              </Link>
            </nav>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} SnowProblem. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
