import { fileURLToPath } from "url";
import path from "path";
import autoprefixer from "autoprefixer";
import assetPath from "./src/services/asset_path.js";
import miniCssExtractPlugin from "mini-css-extract-plugin";
import type { Configuration } from "webpack";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const config: Configuration = {
    mode: "production",
    entry: {
        setup: "./src/public/app/setup.js",
        login: "./src/public/app/login.js",
        mobile: "./src/public/app/mobile.js",
        desktop: "./src/public/app/desktop.js",
        share: "./src/public/app/share.js",
        // TriliumNextTODO: integrate set_password into setup entry point/view
        set_password: "./src/public/app/set_password.js"
    },
    output: {
        publicPath: `${assetPath}/app-dist/`,
        path: path.resolve(rootDir, "build/src/public/app-dist"),
        filename: "[name].js"
    },
    plugins: [
        new miniCssExtractPlugin({
            // TriliumNextTODO: enable this, once webpack build outputs into the "build" folder, instead of "src/public/app-dist" folder => @pano9000
            //filename: "../stylesheets/[name].css"
        })
    ],
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [
                    {
                        loader: "ts-loader",
                        options: {
                            configFile: path.join(rootDir, "tsconfig.webpack.json")
                        }
                    }
                ],
                exclude: /node_modules/
            },
            {
                test: /\.m?js$/,
                resolve: {
                    fullySpecified: false
                }
            },
            {
                // bootstrap CSS related configuration
                test: /\.(css)$/,
                use: [
                    {
                        loader: miniCssExtractPlugin.loader
                    },
                    {
                        loader: "css-loader"
                    },
                    {
                        loader: "postcss-loader",
                        options: {
                            postcssOptions: {
                                plugins: [autoprefixer]
                            }
                        }
                    }
                ]
            },
            {
                // bootstrap CSS related configuration
                test: /\.(scss)$/,
                use: [
                    {
                        loader: miniCssExtractPlugin.loader
                    },
                    {
                        loader: "css-loader"
                    },
                    {
                        loader: "postcss-loader",
                        options: {
                            postcssOptions: {
                                plugins: [autoprefixer]
                            }
                        }
                    },
                    {
                        loader: "sass-loader"
                    }
                ]
            }
        ]
    },
    resolve: {
        extensions: [".ts", ".js"],
        extensionAlias: {
            ".js": [".js", ".ts"],
            ".cjs": [".cjs", ".cts"],
            ".mjs": [".mjs", ".mts"]
        }
    },
    devtool: "nosources-source-map",
    target: "electron-renderer"
};

export default config;
