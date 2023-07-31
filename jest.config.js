/* eslint-env node */
module.exports = {
    roots: ['./src'],
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                tsconfig: './tsconfig.json'
            }
        ]
    }
}
