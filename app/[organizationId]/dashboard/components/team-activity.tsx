import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';
import { RiAppsFill } from 'react-icons/ri';
import { IoLogoGithub } from 'react-icons/io5';
import { SiSlack, SiJira } from 'react-icons/si';
import { MdOutlineTextSnippet } from 'react-icons/md';
import { FaLaptopCode } from 'react-icons/fa';
import { Separator } from '@/components/ui/separator';

const ACTIVITIES = [
    {
        source: "github",
        icon: IoLogoGithub,
        text: "Rishi updated ovlox-dashboard",
        detail: "4 changes pushed",
        time: "5 mins ago",
    },
    {
        source: "github",
        icon: IoLogoGithub,
        text: "Alex merged PR #142",
        detail: "2 files changed",
        time: "12 mins ago",
    },
    {
        source: "slack",
        icon: SiSlack,
        text: "Priya posted in #dev-updates",
        detail: "New message",
        time: "1 hour ago",
    },
    {
        source: "jira",
        icon: SiJira,
        text: "Rishi completed OVL-201",
        detail: "Backend task",
        time: "2 hours ago",
    },
    {
        source: "github",
        icon: IoLogoGithub,
        text: "Alex pushed to main",
        detail: "6 changes pushed",
        time: "3 hours ago",
    },
    {
        source: "github",
        icon: IoLogoGithub,
        text: "Priya opened PR #143",
        detail: "Feature branch",
        time: "5 hours ago",
    },
];


const TeamActivity = () => {
    return (
        <div>
            <Card className="border-[0.5px] border-border bg-card rounded-2xl">
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-2xl font-semibold text-text  ">
                        Team Activity
                    </CardTitle>
                    <Tabs defaultValue="all" className="w-full sm:w-auto">
                        <TabsList className=" border border-border bg-accent-contrast p-[2px] rounded-full">
                            <TabsTrigger value="all" className="cursor-pointer text-base px-2 py-1 rounded-full text-muted dark:data-[state=active]:bg-accent dark:data-[state=active]:text-background">
                                <RiAppsFill /> All
                            </TabsTrigger>
                            <TabsTrigger value="github" className="cursor-pointer text-base px-2 py-1 rounded-full text-muted dark:data-[state=active]:bg-accent dark:data-[state=active]:text-background">
                                <IoLogoGithub /> Github
                            </TabsTrigger>
                            <TabsTrigger value="slack" className="cursor-pointer text-base px-2 py-1 rounded-full text-muted dark:data-[state=active]:bg-accent dark:data-[state=active]:text-background">
                                <SiSlack /> Slack
                            </TabsTrigger>
                            <TabsTrigger value="jira" className="cursor-pointer text-base px-2 py-1 rounded-full text-muted dark:data-[state=active]:bg-accent dark:data-[state=active]:text-background">
                                <SiJira /> Jira
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <div className="flex flex-wrap items-center gap-2">
                        <Select defaultValue="filter">
                            <SelectTrigger
                                size="sm"
                                className="w-[90px] rounded-full border-border"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="filter">Filter</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="week">This week</SelectItem>
                            </SelectContent>
                        </Select>

                        <Tabs defaultValue="all" className="w-full sm:w-auto">
                            <TabsList className=" border border-border bg-accent-contrast p-[2px] rounded-full">
                                <TabsTrigger value="all" className="cursor-pointer text-base px-2 py-1 rounded-full  text-muted dark:data-[state=active]:bg-accent dark:data-[state=active]:text-background">
                                    <MdOutlineTextSnippet />Classic
                                </TabsTrigger>
                                <TabsTrigger value="github" className="cursor-pointer text-base px-2 py-1 rounded-full text-muted dark:data-[state=active]:bg-accent dark:data-[state=active]:text-background">
                                    <FaLaptopCode /> Dev Mode
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </CardHeader>
                <Separator />
                <CardContent>
                    <ul className="space-y-4">
                        {ACTIVITIES.map((activity, i) => {
                            const Icon = activity.icon;
                            return (
                                <li
                                    key={i}
                                    className="grid grid-cols-[1fr_auto_1fr] items-center gap-4"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Icon className="size-8 shrink-0 text-text" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-text">{activity.text}</p>
                                            <div className="text-xs font-normal text-green-600">
                                                {activity.detail}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="justify-self-center whitespace-nowrap text-sm font-normal text-muted">
                                        {activity.time}
                                    </span>
                                    <div className="flex items-center justify-end gap-2 shrink-0">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="shrink-0 border-[0.5px] border-accent bg-background text-xs text-accent">
                                            View Details
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"                                       >
                                            <MoreVertical className="text-muted" />
                                        </Button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </CardContent>
            </Card>
        </div>
    )
}

export default TeamActivity