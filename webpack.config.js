const path = require('path');


// Main webpack configuration
const config = {
    target: 'node',
    entry: './src/web.js',
    output: {
        path: path.resolve(__dirname, 'dist/'),
        filename: 'risibank.js',
    },
    module: {
        rules: [
            {
                test: /\.(png|jpg|gif|svg)$/,
                loader: 'file-loader',
                options: {
                    name: '[name].[ext]?[hash]'
                }
            },
            {
                test: /\.css$/,
                use: [
                    'css-loader'
                ]
            },
            {
                test: /\.scss$/,
                use: [
                    'css-loader',
                    'sass-loader'
                ]
            },
        ]
    },
    resolve: {
        extensions: ['.js', '.json'],
    },
    devtool: false,
};


module.exports = config;
