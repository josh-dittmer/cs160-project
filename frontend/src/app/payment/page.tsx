import TopBar from "@/components/top-bar/top-bar";

export default function PaymentPage() {
  return (
    <div className="w-svw h-svh grid grid-rows-[60px_auto_30px]">
      <TopBar />
      <div style={{ padding: "40px" }}>
        <h1>Payment Page</h1>
        <p>This page will display the payment details later.</p>
      </div>
    </div>
  );
}

