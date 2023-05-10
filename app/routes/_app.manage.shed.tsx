export default function ManageShedRoute() {
    return (
        <section>
            <h1 className="theme-text-h2">Shed Inventory</h1>
            <div className="flex gap-4 my-4">
                <button className="border">Add new item</button>
                <button className="border">Check-in</button>
                <button className="border">Check-out</button>
            </div>
            <div>
                <h2 className="theme-text-h4">Currently checked out</h2>
                <div className="flex flex-col gap-3">
                    <p className="py-2 px-4 border border-gray-400 rounded-md">
                        3 Shovel by Yess Group
                    </p>
                    <p className="py-2 px-4 border border-gray-400 rounded-md">
                        1 Gardening hose by Yess Group
                    </p>
                    <p className="py-2 px-4 border border-gray-400 rounded-md">
                        2 Watering can by Yess Group
                    </p>
                </div>
            </div>
            <h2 className="theme-text-h3">Main List</h2>
            <p>te</p>
            <h2 className="theme-text-h3">Activity</h2>
        </section>
    );
}
