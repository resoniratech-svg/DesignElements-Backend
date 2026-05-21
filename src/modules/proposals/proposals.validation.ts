import Joi from "joi";

export const createProposalSchema = Joi.object({

  client_id: Joi.string()
    .uuid()
    .required()
    .messages({
      "string.base": "Client ID must be a string",
      "string.guid": "Client ID must be a valid UUID",
      "any.required": "Client ID is required"
    }),

  proposal_title: Joi.string()
    .trim()
    .required()
    .messages({
      "string.empty": "Proposal title is required"
    }),

  service_description: Joi.string()
    .allow("")
    .optional(),

  proposal_validity: Joi.date()
    .optional(),

  terms_conditions: Joi.string()
    .allow("")
    .optional(),

  notes: Joi.string()
    .allow("")
    .optional(),

  items: Joi.array()
    .items(
      Joi.object({

        service_name: Joi.string()
          .trim()
          .required()
          .messages({
            "string.empty": "Service name is required"
          }),

        description: Joi.string()
          .allow("")
          .optional(),

        quantity: Joi.number()
          .integer()
          .min(1)
          .required()
          .messages({
            "number.base": "Quantity must be a number",
            "number.min": "Quantity must be at least 1"
          }),

        unit_price: Joi.number()
          .min(0)
          .required()
          .messages({
            "number.base": "Unit price must be a number",
            "number.min": "Unit price cannot be negative"
          })

      })
    )
    .min(1)
    .required()
    .messages({
      "array.base": "Items must be an array",
      "array.min": "At least one service item is required"
    })

});