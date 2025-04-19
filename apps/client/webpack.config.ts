import { fileURLToPath } from "url";
import path from "path";
import autoprefixer from "autoprefixer";
import assetPath from "./src/asset_path.js";
import miniCssExtractPlugin from "mini-css-extract-plugin";
import type { Configuration } from "webpack";
import CopyPlugin from "copy-webpack-plugin";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const config: Configuration = {
    mode: "production",
    entry: {
        setup: "./src/setup.js",
        login: "./src/login.js",
        mobile: "./src/mobile.js",
        desktop: "./src/desktop.js",
        share: "./src/share.js",
        // TriliumNextTODO: integrate set_password into setup entry point/view
        set_password: "./src/set_password.js"
    },
    output: {
        publicPath: `${assetPath}/app-dist/`,
        path: path.resolve(rootDir, "build"),
        filename: "[name].js"
    },
    plugins: [
        new miniCssExtractPlugin({
            // TriliumNextTODO: enable this, once webpack build outputs into the "build" folder, instead of "src/public/app-dist" folder => @pano9000
            //filename: "../stylesheets/[name].css"
        }),
        new CopyPlugin({
            patterns: [
                {
                    context: "../../node_modules/@excalidraw/excalidraw/dist/prod/fonts/",
                    from: "**/*",
                    to: "excalidraw/fonts/"
                }
            ]
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
                            configFile: path.join(rootDir, "tsconfig.json")
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
                        loader: "css-loader",
                        options: {
                            esModule: true
                        }
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
            },
            {
                test: /\.(png)$/i,
                type: 'asset/resource'
            }
        ]
    },
    resolve: {
        extensions: [".ts", ".js"],
        extensionAlias: {
            ".js": [".js", ".ts"],
            ".cjs": [".cjs", ".cts"],
            ".mjs": [".mjs", ".mts"]
        },
        alias: {
            stylesheets: path.resolve(rootDir, "src/public/stylesheets")
        }
    },
    devtool: "nosources-source-map",
    target: "electron-renderer"
};

export default config;
