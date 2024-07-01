import { Restaurant, Product, RestaurantCategory, ProductCategory, sequelizeSession } from '../models/models.js'
import { Sequelize } from 'sequelize'

const index = async function (req, res) {
  try {
    const restaurants = await Restaurant.findAll(
      {
        attributes: { exclude: ['userId'] },
        include:
      {
        model: RestaurantCategory,
        as: 'restaurantCategory'
      },
        order: [[{ model: RestaurantCategory, as: 'restaurantCategory' }, 'name', 'ASC']]
      }
    )
    res.json(restaurants)
  } catch (err) {
    res.status(500).send(err)
  }
}

// SOLUCION
async function pinnedRestaurantsArray (req) {
  return await Restaurant.findAll(
    {
      attributes: { exclude: ['userId'] },
      where: { userId: req.user.id, pinnedAt: { [Sequelize.Op.ne]: null } },

      include: [{
        model: RestaurantCategory,
        as: 'restaurantCategory'
      }],
      order: [['pinnedAt', 'ASC']]
    })
}

async function notPinnedRestaurantsArray (req) {
  return await Restaurant.findAll(
    {
      attributes: { exclude: ['userId'] },
      where: { userId: req.user.id, pinnedAt: null },
      include: [{
        model: RestaurantCategory,
        as: 'restaurantCategory'
      }]
    })
}

const indexOwner = async function (req, res) {
  try {
    const restaurantsPinned = await pinnedRestaurantsArray(req)
    const restaurantsNotPinned = await notPinnedRestaurantsArray(req)
    const restaurants = [...restaurantsPinned, ...restaurantsNotPinned]
    res.json(restaurants)
  } catch (err) {
    res.status(500).send(err)
  }
}

const create = async function (req, res) {
  const newRestaurant = Restaurant.build(req.body)
  newRestaurant.userId = req.user.id // usuario actualmente autenticado
  // SOLUCION
  newRestaurant.pinnedAt = req.body.pinned ? new Date() : null

  try {
    const restaurant = await newRestaurant.save()
    res.json(restaurant)
  } catch (err) {
    res.status(500).send(err)
  }
}

const show = async function (req, res) {
  // Only returns PUBLIC information of restaurants
  try {
    const restaurant = await Restaurant.findByPk(req.params.restaurantId, {
      attributes: { exclude: ['userId'] },
      include: [{
        model: Product,
        as: 'products',
        include: { model: ProductCategory, as: 'productCategory' }
      },
      {
        model: RestaurantCategory,
        as: 'restaurantCategory'
      }],
      order: [[{ model: Product, as: 'products' }, 'order', 'ASC']]
    }
    )
    res.json(restaurant)
  } catch (err) {
    res.status(500).send(err)
  }
}

const update = async function (req, res) {
  try {
    // Si tmb fuera aztualizar:  req.body.pinnedAt = req.body.pinned ? new Date() : null
    await Restaurant.update(req.body, { where: { id: req.params.restaurantId } })
    const updatedRestaurant = await Restaurant.findByPk(req.params.restaurantId)
    res.json(updatedRestaurant)
  } catch (err) {
    res.status(500).send(err)
  }
}

const destroy = async function (req, res) {
  try {
    const result = await Restaurant.destroy({ where: { id: req.params.restaurantId } })
    let message = ''
    if (result === 1) {
      message = 'Sucessfuly deleted restaurant id.' + req.params.restaurantId
    } else {
      message = 'Could not delete restaurant.'
    }
    res.json(message)
  } catch (err) {
    res.status(500).send(err)
  }
}

// SOLUCION
const pin = async function (req, res) {
  const t = await sequelizeSession.transaction()
  try {
    const restaurantPinned = await Restaurant.findByPk(req.params.restaurantId)
    await Restaurant.update(
      { pinnedAt: restaurantPinned.pinnedAt ? null : new Date() },
      { where: { id: restaurantPinned.id } },
      { transaction: t })
    await t.commit()
    const updatedRestaurant = await Restaurant.findByPk(req.params.restaurantId)
    res.json(updatedRestaurant)
  } catch (err) {
    await t.rollback()
    res.status(500).send(err)
  }
}

const RestaurantController = {
  index,
  indexOwner,
  create,
  show,
  update,
  destroy,
  pin
}
export default RestaurantController
