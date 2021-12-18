"use strict";

import path from "path";
import { connect } from "../data/connect.js";

export const getPrefix = connect({
    "path": path.resolve(`/run/redis/redis.sock`),
    "poolMax": 5,
});
