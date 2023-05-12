export const createItem = async ({}) => {
    const item = await db;
};

export type CreatedItemResult = Awaited<ReturnType<typeof createItem>>;
