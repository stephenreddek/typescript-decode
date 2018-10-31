import * as Decode from '../src'
import { expect } from 'chai'

describe('decoders', () => {
   describe('object', () => {
      describe('with a valid object', () => {
         it('should decode to itself', () => {
            interface Valid {
               name: string
               id: number
            }

            const validObjectDecoder = Decode.object<Valid>({
               name: Decode.required('name', Decode.str),
               id: Decode.required('id', Decode.number),
            })

            const valid_object: Valid = {
               name: 'tester',
               id: 42,
            }

            expect(valid_object).to.deep.equal(validObjectDecoder(valid_object))
         })
      })
   })

   describe('array', () => {
      describe('with an array of numbers', () => {
         it('should decode successfully', () => {
            const validArrayDecoder = Decode.array(Decode.number)

            const valid_array = [1, 2, 3, 4]

            expect(valid_array).to.deep.equal(validArrayDecoder(valid_array))
         })
      })
   })

   describe('required', () => {
      describe('when the object doesnt contain the required field', () => {
         it('should blow', () => {
            interface Valid {
               name: string
               id: number
            }

            const validObjectDecoder = Decode.object<Valid>({
               name: Decode.required('name', Decode.str),
               id: Decode.required('id', Decode.number),
            })

            const valid_object: any = {
               name: 'tester',
            }

            try {
               validObjectDecoder(valid_object)
               expect.fail('Should have thrown an exception')
            } catch (e) {
               expect(e.message).to.equal(
                  'Decode Failure: Expected the value to be a number at [id]. Expected the value at [id] to be a number but there was none.'
               )
            }
         })
      })

      describe('when the object contains the required field', () => {
         describe('and it is valid', () => {
            it('should decode successfully', () => {
               interface Valid {
                  name: string
                  id: number
               }

               const validObjectDecoder = Decode.object<Valid>({
                  name: Decode.required('name', Decode.str),
                  id: Decode.required('id', Decode.number),
               })

               const valid_object: Valid = {
                  name: 'tester',
                  id: 42,
               }

               expect(valid_object).to.deep.equal(validObjectDecoder(valid_object))
            })
         })

         describe('and it is an invalid value', () => {
            it('should blow', () => {
               interface Valid {
                  name: string
                  id: number
               }

               const validObjectDecoder = Decode.object<Valid>({
                  name: Decode.required('name', Decode.str),
                  id: Decode.required('id', Decode.number),
               })

               const valid_object: any = {
                  name: 'tester',
                  id: 'invalid',
               }

               try {
                  validObjectDecoder(valid_object)
                  expect.fail('Should have thrown an exception')
               } catch (e) {
                  expect(e.message).to.equal('Decode Failure: Expected the value to be a number at [id]. Expected to be a number but got [invalid].')
               }
            })
         })
      })
   })
})
