
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function ConnectedAppsPage() {
  return (
    <Card>
        <CardHeader>
          <CardTitle>Connected Apps</CardTitle>
          <CardDescription>
            Connect your fitness apps to automatically import workout data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                    <h4 className="font-semibold">Strava</h4>
                    <p className="text-sm text-muted-foreground">Not connected</p>
                </div>
                <Button>Connect</Button>
            </div>
             <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                    <h4 className="font-semibold">MapMyRide</h4>
                    <p className="text-sm text-muted-foreground">Not connected</p>
                </div>
                <Button>Connect</Button>
            </div>
        </CardContent>
    </Card>
  )
}
