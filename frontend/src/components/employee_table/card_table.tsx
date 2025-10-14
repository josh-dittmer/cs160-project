export function CardTable({children}: {children: React.ReactNode}) {
    return (
        <div className="table-card">
            <table className="table">{children}</table>
        </div>
    );
}