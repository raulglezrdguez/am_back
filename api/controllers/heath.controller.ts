export const getHealth = (req: any, res: any) => {
  return res.status(200).send({ status: "ok", uptime: process.uptime() });
};
