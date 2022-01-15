"use strict";

import path from "path";
import { connect } from "../data/connect.js";

export const run = connect({
    "path": path.resolve(`/var/lib/redis/redis.sock`),
    "poolMax": 6,
    "debug": process.env.NODE_ENV === `development`,
});
