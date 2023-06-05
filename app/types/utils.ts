// Extract the type of an element from an array
export type Unpacked<T> = T extends (infer U)[] ? U : T;
