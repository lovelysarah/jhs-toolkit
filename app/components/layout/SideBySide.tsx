export default function SideBySide({
    left,
    right,
}: {
    left: JSX.Element;
    right: JSX.Element;
}) {
    return (
        <div className="flex gap-8 justify-between items-start">
            <div className="basis-3/5 bg-base-200 rounded-lg p-8">{left}</div>
            <aside className="basis-2/5 sticky top-8 bg-base-200 rounded-lg p-8">
                {right}
            </aside>
        </div>
    );
}
