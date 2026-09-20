import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, navigate] = useLocation();

  const [login, setLogin] = useState({ username: "", password: "" });
  const [register, setRegister] = useState({
    username: "",
    password: "",
    email: "",
    fullName: "",
    phoneNumber: "",
  });

  // Redirect once a session exists, including straight after a successful login.
  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="grid w-full max-w-4xl gap-8 md:grid-cols-2">
        <div className="hidden flex-col justify-center md:flex">
          <h1 className="text-3xl font-semibold">RideShare</h1>
          <p className="mt-3 text-muted-foreground">
            Share rides, cut travel costs, and earn points for every trip you
            take or offer.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign in</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form
                  className="space-y-4 pt-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    loginMutation.mutate(login);
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="login-username">Username</Label>
                    <Input
                      id="login-username"
                      autoComplete="username"
                      required
                      value={login.username}
                      onChange={(e) =>
                        setLogin({ ...login, username: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={login.password}
                      onChange={(e) =>
                        setLogin({ ...login, password: e.target.value })
                      }
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Sign in
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form
                  className="space-y-4 pt-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    registerMutation.mutate({
                      ...register,
                      fullName: register.fullName || undefined,
                      phoneNumber: register.phoneNumber || undefined,
                    });
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="register-username">Username</Label>
                    <Input
                      id="register-username"
                      autoComplete="username"
                      required
                      value={register.username}
                      onChange={(e) =>
                        setRegister({ ...register, username: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={register.email}
                      onChange={(e) =>
                        setRegister({ ...register, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-fullname">Full name</Label>
                    <Input
                      id="register-fullname"
                      autoComplete="name"
                      value={register.fullName}
                      onChange={(e) =>
                        setRegister({ ...register, fullName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-phone">Phone number</Label>
                    <Input
                      id="register-phone"
                      autoComplete="tel"
                      value={register.phoneNumber}
                      onChange={(e) =>
                        setRegister({
                          ...register,
                          phoneNumber: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={register.password}
                      onChange={(e) =>
                        setRegister({ ...register, password: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      At least 8 characters.
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
