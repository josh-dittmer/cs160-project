import { redirect } from "next/navigation";

export default function Home() {
    redirect('/home/dashboard');

    return (
        <h1>Hello, world!</h1>
    );
}
