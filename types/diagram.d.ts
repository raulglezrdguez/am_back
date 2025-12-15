export type ExpressionInput = {
  label: string;
  value: string;
  reference?: string;
};

export type DiagramNode = {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
  data?: Record<string, any>;
};

export type DiagramEdge = {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: Record<string, any>;
};

export type DiagramViewport = {
  x?: number;
  y?: number;
  zoom?: number;
};

export type CreateDiagramInput = {
  title: string;
  description: string;
  author: string;
  public?: boolean;
  expression?: ExpressionInput[];
  nodes?: DiagramNode[];
  edges?: DiagramEdge[];
  viewport?: DiagramViewport;
};

export type UpdateDiagramInput = {
  title?: string;
  description?: string;
  public?: boolean;
  expression?: ExpressionInput[];
  nodes?: DiagramNode[];
  edges?: DiagramEdge[];
  viewport?: DiagramViewport;
};

export type DiagramInput = {
  id: string;
  title: string;
  description: string;
  author: string;
  public: boolean;
  expression?: ExpressionInput[];
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  viewport: DiagramViewport;
};

export type DiagramFilterInput = {
  author?: string;
  public?: boolean;
};

export type DiagramSortInput = {
  field: "createdAt" | "updatedAt" | "title";
  order: "asc" | "desc";
};

export type DiagramPaginationInput = {
  limit: number;
  offset: number;
};

export type DiagramQueryInput = {
  filter?: DiagramFilterInput;
  sort?: DiagramSortInput;
  pagination?: DiagramPaginationInput;
};

export type DiagramOutput = {
  id: string;
  _id: string;
  title: string;
  description: string;
  author: string;
  public: boolean;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  viewport: DiagramViewport;
  createdAt: Date;
  updatedAt: Date;
};

export type DiagramListOutput = {
  diagrams: DiagramOutput[];
  totalCount: number;
};
