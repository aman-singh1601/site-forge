import { Button } from "@/components/ui/button";
export default function MyButton ({
    children
}:{
    type?: string,
    children?: string
}) {

    return <Button
        className="py-4 px-6 text-lg"
        variant={"outline"}>
        {children}
    </Button>
};