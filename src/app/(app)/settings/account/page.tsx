
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function AccountSettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Settings</CardTitle>
        <CardDescription>
          Manage your billing and subscription details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button>Manage Billing</Button>
      </CardContent>
    </Card>
  )
}
